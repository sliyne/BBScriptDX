use std::{
    fs::File,
    io::{Cursor, Read, Seek, SeekFrom, Write},
    path::Path,
};

use anyhow::{Context, Result};
use byteorder::{ReadBytesExt, WriteBytesExt, LE};

pub const UEXP_SIZE_OFFSET: usize = 0x24;
pub const UEXP_FILE_START: usize = 0x34;

pub fn inject_embedded_file(file_bytes: &[u8], uexp_path: &Path, uasset_path: &Path) -> Result<()> {
    let mut uexp_file = File::open(uexp_path)
        .with_context(|| format!("Failed to open uexp: {}", uexp_path.display()))?;
    let mut uasset_file = File::open(uasset_path)
        .with_context(|| format!("Failed to open uasset: {}", uasset_path.display()))?;

    let mut uexp_bytes = Vec::new();
    let mut uasset_bytes = Vec::new();

    uexp_file.read_to_end(&mut uexp_bytes)?;
    uasset_file.read_to_end(&mut uasset_bytes)?;

    let mut uexp = Cursor::new(uexp_bytes);
    let mut uasset = Cursor::new(uasset_bytes);

    // Read trailing magic
    uexp.seek(SeekFrom::End(-4))?;
    let magic = uexp.read_u32::<LE>()?;

    let total_uasset_size = uasset.get_ref().len() as u32;
    let total_uexp_size = (uexp.get_ref().len() - 4) as u32;
    let total_combined_size = total_uasset_size + total_uexp_size;
    let contained_file_size = (uexp.get_ref().len() - 0x38) as u32;

    // Resize and rewrite uexp payload
    uexp.get_mut()
        .resize(UEXP_FILE_START + file_bytes.len() + 4, 0);

    uexp.set_position(UEXP_FILE_START as u64);
    uexp.write_all(file_bytes)?;
    uexp.write_u32::<LE>(magic)?;

    // Update duplicated size fields in uexp
    let size_offset =
        find_seq(uexp.get_ref(), &contained_file_size.to_le_bytes()).unwrap_or(UEXP_SIZE_OFFSET);

    uexp.set_position(size_offset as u64);
    let file_bytes_size = file_bytes.len() as u32;
    uexp.write_u32::<LE>(file_bytes_size)?;
    uexp.write_u32::<LE>(file_bytes_size)?;

    // Update total uasset + uexp size in uasset
    let uasset_total_pos =
        find_seq(uasset.get_ref(), &total_combined_size.to_le_bytes()).unwrap_or(0xA9);

    // Update uexp size in uasset
    let uasset_uexp_pos = find_seq(uasset.get_ref(), &total_uexp_size.to_le_bytes())
        .ok_or_else(|| anyhow::anyhow!("Could not find uasset uexp size description offset"))?;

    let new_total_size = (uexp.get_ref().len() + uasset.get_ref().len() - 4) as u32;
    uasset.set_position(uasset_total_pos as u64);
    uasset.write_u32::<LE>(new_total_size)?;

    let new_uexp_size = (uexp.get_ref().len() - 4) as u32;
    uasset.set_position(uasset_uexp_pos as u64);
    uasset.write_u32::<LE>(new_uexp_size)?;

    // Write files back in place
    let mut new_uasset = File::create(uasset_path)
        .with_context(|| format!("Failed to write uasset: {}", uasset_path.display()))?;
    new_uasset.write_all(uasset.get_ref())?;

    let mut new_uexp = File::create(uexp_path)
        .with_context(|| format!("Failed to write uexp: {}", uexp_path.display()))?;
    new_uexp.write_all(uexp.get_ref())?;

    Ok(())
}

fn find_seq(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}