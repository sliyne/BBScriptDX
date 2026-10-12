use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};

use crate::fs_utils::ensure_parent_dir;
use crate::protocol::{HelperRequest, HelperResponse, MissingItem, ProcessedItem};
use crate::u4pak::index::Encoding;
use crate::u4pak::pack::{pack, PackOptions, PackPath, COMPR_DEFAULT};
use crate::u4pak::pak::{COMPR_NONE, Variant};

pub fn run_package(request: HelperRequest) -> Result<HelperResponse> {
    let mut response = HelperResponse::ok();

    let project_root = PathBuf::from(&request.project_root);

    let uassets_root = PathBuf::from(
        request
            .uassets_root
            .clone(),
    );

    let packages_root = PathBuf::from(
        request
            .packages_root
            .clone()
            .ok_or_else(|| anyhow!("package requires packages_root"))?,
    );

    let package_name = request
        .package_name
        .clone()
        .unwrap_or_else(|| {
            project_root
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "Mod".to_string())
        });

    let red_root = uassets_root.join("RED");
    if !red_root.exists() {
        response.ok = false;
        response.missing.push(MissingItem {
            source: Some(red_root.display().to_string()),
            expected: None,
            kind: Some("RED root".to_string()),
        });
        return Ok(response);
    }

    let pak_path = packages_root.join(format!("{package_name}.pak"));
    ensure_parent_dir(&pak_path)?;

    response.logs.push(format!("Project root: {}", project_root.display()));
    response.logs.push(format!("UASSETS root: {}", uassets_root.display()));
    response.logs.push(format!("RED source: {}", red_root.display()));
    response.logs.push(format!("Output pak: {}", pak_path.display()));
    response.logs.push("Pak version: 3".to_string());
    response.logs.push("Mount point: ../../..".to_string());
    response.logs.push("Archive rename: /RED".to_string());
    response.logs.push("Compression: none".to_string());

    let pack_path = PackPath {
        compression_method: COMPR_NONE,
        compression_block_size: None,
        compression_level: None,
        filename: red_root.display().to_string(),
        rename: Some("/RED".to_string()),
    };

    let options = PackOptions {
        variant: Variant::Standard,
        version: 3,
        mount_point: Some("../../.."),
        compression_method: COMPR_NONE,
        compression_block_size: crate::u4pak::pak::DEFAULT_BLOCK_SIZE,
        compression_min_size: crate::u4pak::pak::DEFAULT_MIN_COMPRESSION_SIZE,
        compression_level: crate::u4pak::pak::DEFAULT_COMPRESSION_LEVEL,
        encoding: Encoding::UTF8,
        verbose: false,
        null_separated: false,
        thread_count: std::num::NonZeroUsize::new(num_cpus::get())
            .unwrap_or_else(|| std::num::NonZeroUsize::new(1).unwrap()),
    };

    match pack(&pak_path, &[pack_path], options) {
        Ok(_) => {
            response.processed.push(ProcessedItem {
                source: Some(red_root.display().to_string()),
                output: Some(pak_path.display().to_string()),
                message: Some("Package created successfully".to_string()),
            });
        }
        Err(e) => {
            response.ok = false;
            response.errors.push(crate::protocol::HelperErrorItem {
                message: format!("Packaging failed: {}", e),
            });
        }
    }

    Ok(response)
}