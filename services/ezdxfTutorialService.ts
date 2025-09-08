// Fetch and cache the official ezdxf Tutorials content verbatim for LLM prompts.
// This avoids shipping massive static files while ensuring accuracy (no paraphrasing).
// On first use, it fetches all tutorial pages and caches them in localStorage.

export interface TutorialCacheEntry {
  combined: string;
  fetchedAt: number; // epoch ms
  version: string; // docs version marker
}

const CACHE_KEY = 'ezdxf-tutorials-cache-v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// Curated order: creation, attributes, layers, entities, dimensions, hatch, blocks, text, UCS, viewports, selection, external references, image export, etc.
export const EZDXF_TUTORIAL_URLS: { title: string; url: string }[] = [
  { title: 'Tutorial for Creating DXF Drawings', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/tutorial_drawing.html' },
  { title: 'Tutorial for Common Graphical Attributes', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/common_graphical_attributes.html' },
  { title: 'Tutorial for Layers', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/layers.html' },
  { title: 'Tutorial for Simple DXF Entities', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/simple_dxf_entities.html' },
  { title: 'Tutorial for LWPolyline', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/lwpolyline.html' },
  { title: 'Tutorial for Text', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/text.html' },
  { title: 'Tutorial for MText and MTextEditor', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/mtext.html' },
  { title: 'Tutorial for Hatch', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/hatch.html' },
  { title: 'Tutorial for Hatch Pattern Definition', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/hatch_pattern.html' },
  { title: 'Tutorial for Blocks', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/blocks.html' },
  { title: 'Tutorial for Entity Selection', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/entity_query.html' },
  { title: 'Tutorial for OCS/UCS Usage', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/ocs_ucs_usage.html' },
  { title: 'Tutorial for UCS Based Transformations', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/ucs_transformations.html' },
  { title: 'Tutorial for Linear Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_linear.html' },
  { title: 'Tutorial for Radius Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_radius.html' },
  { title: 'Tutorial for Diameter Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_diameter.html' },
  { title: 'Tutorial for Angular Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_angular.html' },
  { title: 'Tutorial for Arc Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_arc.html' },
  { title: 'Tutorial for Ordinate Dimensions', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/dim_ordinate.html' },
  { title: 'Tutorial for Viewports in Paperspace', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/viewports.html' },
  { title: 'Tutorial for Image and ImageDef', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/image.html' },
  { title: 'Tutorial for Underlay and UnderlayDefinition', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/underlay.html' },
  { title: 'Tutorial for MultiLeader', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/mleader.html' },
  { title: 'Storing Custom Data in DXF Files', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/storing_custom_data.html' },
  { title: 'Tutorial for External References', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/xref.html' },
  { title: 'Tutorial for Image Export', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/image_export.html' },
  { title: 'Tutorial for Finding Chains and Loops', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/find_chains_and_loops.html' },
  { title: 'Tutorial for Getting Data from DXF Files', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/getting_data_from_dxf.html' },
  { title: 'Tutorial for Creating Linetype Pattern', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/linetype.html' },
  { title: 'Tutorial for Creating Complex Linetype Pattern', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/complex_linetype.html' },
  { title: 'Tutorial for Spline', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/spline.html' },
  { title: 'Tutorial for Polyface', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/polyface.html' },
  { title: 'Tutorial for Mesh', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/mesh.html' },
  { title: 'Tutorial for the Geo Add-on', url: 'https://ezdxf.readthedocs.io/en/stable/tutorials/geo.html' },
];

function stripHtmlToText(html: string): string {
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Remove nav and footer content heuristically
    const toRemove = div.querySelectorAll('nav, header, footer, script, style');
    toRemove.forEach(el => el.remove());
    // Keep only main content where possible
    const main = div.querySelector('div.document, div.body, main') || div;
    const text = (main as HTMLElement).innerText || div.innerText || html;
    return text.replace(/\s+$/g, '').trim();
  } catch {
    return html;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  return stripHtmlToText(html);
}

export async function getCombinedTutorials(forceRefresh = false, maxChars = 350000): Promise<TutorialCacheEntry> {
  const now = Date.now();
  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (!forceRefresh && cachedRaw) {
    try {
      const cached: TutorialCacheEntry = JSON.parse(cachedRaw);
      if (now - cached.fetchedAt < CACHE_TTL_MS && cached.combined?.length > 0) return cached;
    } catch {}
  }
  // Fetch all, concatenate with clear separators
  let combined = `Official ezdxf Tutorials (verbatim) - fetched ${new Date(now).toISOString()}\n\n`;
  for (const item of EZDXF_TUTORIAL_URLS) {
    try {
      const text = await fetchText(item.url);
      combined += `===== ${item.title} =====\nSource: ${item.url}\n\n${text}\n\n`;
      if (combined.length > maxChars) break;
    } catch (err) {
      combined += `===== ${item.title} =====\nSource: ${item.url}\n[Fetch failed: ${String(err)}]\n\n`;
    }
  }
  const entry: TutorialCacheEntry = { combined, fetchedAt: now, version: '1.4.2' };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch {}
  return entry;
}

