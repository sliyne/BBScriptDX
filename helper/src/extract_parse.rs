use std::fs;
use std::path::Path;

use anyhow::{anyhow, Result};

use crate::fs_utils::ensure_parent_dir;
use crate::game_config::ScriptConfig;
use crate::protocol::{HelperRequest, HelperResponse, ProcessedItem};
use crate::unpack::extract_embedded_file;

pub fn run_extract_parse(request: HelperRequest) -> Result<HelperResponse> {
    let mut response = HelperResponse::ok();

    let ron_path = request
        .ron_path
        .clone()
        .ok_or_else(|| anyhow!("extract-parse requires ron_path"))?;

    let assets = request
        .assets
        .clone()
        .ok_or_else(|| anyhow!("extract-parse requires assets"))?;

    let overwrite = request.overwrite_project_files.unwrap_or(false);

    let config = ScriptConfig::load(&ron_path)
        .map_err(|e| anyhow!("Failed to load .ron config '{}': {}", ron_path, e))?;

    response.logs.push(format!("Using ron: {}", ron_path));
    response.logs.push(format!("Assets requested: {}", assets.len()));

    for asset in assets {
        let output_path = Path::new(&asset.output_file);
        ensure_parent_dir(output_path)?;

        if output_path.exists() && !overwrite {
            response.skipped.push(crate::protocol::SkippedItem {
                source: Some(asset.source_uasset.clone()),
                reason: format!(
                    "Output already exists and overwrite is disabled: {}",
                    output_path.display()
                ),
            });
            continue;
        }

        let extracted = extract_embedded_file(Path::new(&asset.source_uexp))?;

        if asset.kind == "bbs" {
            if let Some(bbscript_path) = &asset.bbscript_output_file {
                let bbscript_output = Path::new(bbscript_path);

                if let Some(parent) = bbscript_output.parent() {
                    std::fs::create_dir_all(parent)?;
                }

                std::fs::write(bbscript_output, &extracted)?;
            }
        }

        match asset.kind.as_str() {
            "bbs" => {
                let parsed = config
                    .parse_to_string::<byteorder::LittleEndian>(&extracted, 12)
                    .map_err(|e| anyhow!("Failed to parse {}: {}", asset.source_uasset, e))?;

                fs::write(output_path, parsed.as_bytes())?;

                response.processed.push(ProcessedItem {
                    source: Some(asset.source_uasset.clone()),
                    output: Some(asset.output_file.clone()),
                    message: Some("Extracted and parsed BBScript".to_string()),
                });
            }

            "col" => {
                let pac_output_path = asset
                    .pac_output_file
                    .clone()
                    .ok_or_else(|| {
                        anyhow!(
                            "COL asset '{}' is missing pac_output_file",
                            asset.source_uasset
                        )
                    })?;

                let pac_path = Path::new(&pac_output_path);
                ensure_parent_dir(pac_path)?;
                fs::write(pac_path, &extracted)?;

                response.processed.push(ProcessedItem {
                    source: Some(asset.source_uasset.clone()),
                    output: Some(pac_output_path),
                    message: Some("Extracted COL file as raw .pac".to_string()),
                });
            }

            other => {
                response.ok = false;
                response.errors.push(crate::protocol::HelperErrorItem {
                    message: format!("Unknown asset kind '{}'", other),
                });
            }
        }
    }

    Ok(response)
}