use std::{
    env,
    fs::File,
    io::{Read, Writejonbin(jon: &GGSTJonBin) -> JonBinExport {    io::{Read, Write},
    let boxes = jon
        .boxes
        .iter()
        .map(|group| group.iter().map(export_hitbox).collect::<Vec<_>>())
        .collect::<Vec<_>>();

    JonBinExport {
        names: jon.names.clone(),
        boxes,
    }
}

fn export_hitbox(hitbox: &HitBox) -> HitBoxExport {
    HitBoxExport {
        kind: hitbox.kind,
        x_offset: hitbox.rect.x_offset,
        y_offset: hitbox.rect.y_offset,
        width: hitbox.rect.width,
        height: hitbox.rect.height,
        extra: hitbox.extra,
    }
}

fn text_preview(bytes: &[u8]) -> String {
    let lossy = String::from_utf8_lossy(bytes);
    let cleaned = lossy
        .chars()
        .map(|c| {
            if c.is_control() && c != '\n' && c != '\r' && c != '\t' {
                '·'
            } else {
                c
            }
        })
        .collect::<String>();

    cleaned.chars().take(300).collect()
}

fn hex_preview(bytes: &[u8], limit: usize) -> String {
    bytes.iter()
        .take(limit)
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ")
}
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use arcsys::ggst::{
    jonbin::{GGSTJonBin, HitBox},
    pac::GGSTPac,
};
use serde::Serialize;

#[derive(Serialize)]
struct PacExport {
    source_file: String,
    entry_count: usize,
    entries: Vec<EntryExport>,
}

#[derive(Serialize)]
struct EntryExport {
    id: u32,
    unknown: u32,
    name: String,
    size: usize,
    kind: String,
    jonbin: Option<JonBinExport>,
    text_preview: Option<String>,
    hex_preview: Option<String>,
}

#[derive(Serialize)]
struct JonBinExport {
    names: Vec<String>,
    boxes: Vec<Vec<HitBoxExport>>,
}

#[derive(Serialize)]
struct HitBoxExport {
    kind: u32,
    x_offset: f32,
    y_offset: f32,
    width: f32,
    height: f32,
    extra: Option<u32>,
}

fn main() -> Result<()> {
    let mut args = env::args().skip(1);

    let input = args
        .next()
        .context("Usage: cargo run --bin pac_to_json -- <input.pac> <output.json> [--gbvs]")?;
    let output = args
        .next()
        .context("Usage: cargo run --bin pac_to_json -- <input.pac> <output.json> [--gbvs]")?;

    let is_gbvs = args.any(|arg| arg == "--gbvs");

    let input_path = PathBuf::from(&input);
    let output_path = PathBuf::from(&output);

    let pac = read_pac(&input_path)?;
    let export = export_pac(&input_path, pac, is_gbvs);

    let json = serde_json::to_string_pretty(&export)?;
    let mut out = File::create(&output_path)
        .with_context(|| format!("Failed to create output file: {}", output_path.display()))?;
    out.write_all(json.as_bytes())?;

    println!("Wrote {}", output_path.display());
    Ok(())
}

fn read_pac(path: &Path) -> Result<GGSTPac> {
    let mut file_buf = Vec::new();

    File::open(path)
        .with_context(|| format!("Failed to open PAC file: {}", path.display()))?
        .read_to_end(&mut file_buf)
        .with_context(|| format!("Failed to read PAC file: {}", path.display()))?;

    let pac = GGSTPac::parse(&file_buf)
        .map_err(|e| anyhow::anyhow!("Failed to parse PAC: {}", e))?;

    Ok(pac)
}

fn export_pac(source_path: &Path, pac: GGSTPac, is_gbvs: bool) -> PacExport {
    let entries = pac
        .files
        .into_iter()
        .map(|entry| {
            let parsed_jon = GGSTJonBin::parse(&entry.contents, is_gbvs).ok();

            if let Some(jon) = parsed_jon {
                EntryExport {
                    id: entry.id,
                    unknown: entry.unknown,
                    name: entry.name,
                    size: entry.contents.len(),
                    kind: "jonbin".to_string(),
                    jonbin: Some(export_jonbin(&jon)),
                    text_preview: None,
                    hex_preview: None,
                }
            } else {
                EntryExport {
                    id: entry.id,
                    unknown: entry.unknown,
                    name: entry.name,
                    size: entry.contents.len(),
                    kind: "raw".to_string(),
                    jonbin: None,
                    text_preview: Some(text_preview(&entry.contents)),
                    hex_preview: Some(hex_preview(&entry.contents, 128)),
                }
            }
        })
        .collect::<Vec<_>>();

    PacExport {
        source_file: source_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| source_path.display().to_string()),
        entry_count: entries.len(),
        entries,
    }
}

