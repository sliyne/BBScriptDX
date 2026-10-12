use std::fs::File;
use std::io::Read;
use std::path::Path;

use anyhow::{Context, Result};

pub const UEXP_FILE_START: usize = 0x34;

pub fn extract_embedded_file(uexp_path: &Path) -> Result<Vec<u8>> {
    let mut uexp = File::open(uexp_path)
        .with_context(|| format!("Failed to open uexp: {}", uexp_path.display()))?;

    let mut uexp_bytes = Vec::new();
    uexp.read_to_end(&mut uexp_bytes)
        .with_context(|| format!("Failed to read uexp: {}", uexp_path.display()))?;

    if uexp_bytes.len() < UEXP_FILE_START + 4 {
        anyhow::bail!("UEXP too small to contain an embedded file: {}", uexp_path.display());
    }

    let contained_file = &uexp_bytes[UEXP_FILE_START..uexp_bytes.len() - 4];
    Ok(contained_file.to_vec())
}