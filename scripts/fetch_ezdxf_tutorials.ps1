$urls = @(
  'https://ezdxf.readthedocs.io/en/stable/tutorials/getting_data.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/simple_drawings.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/common_graphical_attributes.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/layers.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/linetypes.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/complex_linetypes.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/dxf_primitives.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/entity_query.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/blocks.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/lwpolyline.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/text.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/mtext.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/spline.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/polyface.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/mesh.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/hatch.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/hatch_pattern.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/image.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/underlay.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/mleader.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/viewports.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/ocs_ucs_usage.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/ucs_transformations.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/linear_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/radius_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/diameter_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/angular_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/arc_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/ordinate_dimension.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/geo.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/custom_data.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/xref_module.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/image_export.html',
  'https://ezdxf.readthedocs.io/en/stable/tutorials/find_chains_and_loops.html'
)

$dest = 'public/ezdxf_tutorial_bundle.txt'

Set-Content -Path $dest -Value ''

foreach ($u in $urls) {
  try {
    Write-Host ("Fetching $u")
    $r = Invoke-WebRequest -UseBasicParsing -Uri $u
    Add-Content -Path $dest -Value ("===== $u =====`r`n")
    Add-Content -Path $dest -Value $r.Content
    Add-Content -Path $dest -Value ("`r`n`r`n")
  } catch {
    Add-Content -Path $dest -Value ("===== $u =====`r`n[Fetch failed]`r`n`r`n")
    Write-Host ("Failed $u")
  }
}

Write-Host 'Done.'

