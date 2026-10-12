use std::fs;
use std::path::Path;

use anyhow::{anyhow, Result};

use crate::game_config::ScriptConfig;
use crate::inject::inject_embedded_file;
use crate::protocol::{
    HelperErrorItem, HelperRequest, HelperResponse, MissingItem, ProcessedItem, SkippedItem,
};
use crate::rebuilder::rebuild_bbscript;

/// Rebuild readable .bbs files back into .bbscript bytes,
/// then reinject them into the matching .uexp/.uasset files.
///
/// Rules:
/// - kind == "bbs" -> rebuild + reinject
/// - kind == "col" -> reinject .pac directly (no rebuild)
pub fn run_rebuild_reinject(request: HelperRequest) -> Result<HelperResponse> {
    let mut response = HelperResponse::ok();

    let ron_path = request
        .ron_path
        .clone()
        .ok_or_else(|| anyhow!("rebuild-reinject requires ron_path"))?;

    let assets = request
        .assets
        .clone()
        .ok_or_else(|| anyhow!("rebuild-reinject requires assets"))?;

    let config = ScriptConfig::load(&ron_path)
        .map_err(|e| anyhow!("Failed to load .ron config '{}': {}", ron_path, e))?;

    response.logs.push(format!("Using ron: {}", ron_path));
    response.logs.push(format!("Assets requested: {}", assets.len()));

    for asset in assets {
        let project_file = Path::new(&asset.output_file);
        let source_uasset = Path::new(&asset.source_uasset);
        let source_uexp = Path::new(&asset.source_uexp);

        response.logs.push(format!(
            "Processing [{}] {}",
            asset.kind, asset.output_file
        ));

        if !project_file.exists() {
            response.skipped.push(SkippedItem {
                source: Some(asset.output_file.clone()),
                reason: "Project-side file does not exist".to_string(),
            });
            continue;
        }

        if !source_uasset.exists() {
            response.missing.push(MissingItem {
                source: Some(asset.source_uasset.clone()),
                expected: None,
                kind: Some("uasset".to_string()),
            });
            continue;
        }

        if !source_uexp.exists() {
            response.missing.push(MissingItem {
                source: Some(asset.source_uasset.clone()),
                expected: Some(asset.source_uexp.clone()),
                kind: Some("uexp".to_string()),
            });
            continue;
        }

        match asset.kind.as_str() {
            "bbs" => {
                let script = match fs::read_to_string(project_file) {
                    Ok(s) => s,
                    Err(e) => {
                        response.ok = false;
                        response.errors.push(HelperErrorItem {
                            message: format!(
                                "Failed to read script '{}': {}",
                                project_file.display(),
                                e
                            ),
                        });
                        continue;
                    }
                };

                let rebuilt = match rebuild_bbscript::<byteorder::LittleEndian>(
                    config.clone(),
                    script,
                ) {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        response.ok = false;
                        response.errors.push(HelperErrorItem {
                            message: format!(
                                "Failed to rebuild '{}': {}",
                                project_file.display(),
                                e
                            ),
                        });
                        continue;
                    }
                };

                if let Err(e) = inject_embedded_file(&rebuilt, source_uexp, source_uasset) {
                    response.ok = false;
                    response.errors.push(HelperErrorItem {
                        message: format!(
                            "Failed to reinject rebuilt file into '{}' / '{}': {}",
                            source_uexp.display(),
                            source_uasset.display(),
                            e
                        ),
                    });
                    continue;
                }

                response.processed.push(ProcessedItem {
                    source: Some(asset.output_file.clone()),
                    output: Some(asset.source_uasset.clone()),
                    message: Some("Rebuilt and reinjected BBScript".to_string()),
                });
            }

            "col" => {
                let pac_bytes = match fs::read(project_file) {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        response.ok = false;
                        response.errors.push(HelperErrorItem {
                            message: format!(
                                "Failed to read PAC '{}': {}",
                                project_file.display(),
                                e
                            ),
                        });
                        continue;
                    }
                };

                if let Err(e) = inject_embedded_file(&pac_bytes, source_uexp, source_uasset) {
                    response.ok = false;
                    response.errors.push(HelperErrorItem {
                        message: format!(
                            "Failed to reinject PAC into '{}' / '{}': {}",
                            source_uexp.display(),
                            source_uasset.display(),
                            e
                        ),
                    });
                    continue;
                }

                response.processed.push(ProcessedItem {
                    source: Some(asset.output_file.clone()),
                    output: Some(asset.source_uasset.clone()),
                    message: Some("Reinjected .pac file".to_string()),
                });
            }

            other => {
                response.ok = false;
                response.errors.push(HelperErrorItem {
                    message: format!("Unknown asset kind '{}'", other),
                });
            }
        }
    }

    Ok(response)
}
