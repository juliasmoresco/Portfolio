# 3D models: provenance

| File | Origin |
| --- | --- |
| `bookshelf.glb` | Made by the site's owner with Claude Design (exported from three.js, `THREE.GLTFExporter r184`). |
| `wall-shelf-plant.glb` | Same. |
| `llama-bank.glb` | Same. No longer used: the llama is now built in code (see below); kept only until the new one is signed off. |
| `rotary-telephone.glb` | Same. No longer used: the phone is now built in code in `src/scene/phone.ts`; kept only until the new one is signed off. |
| `cat-talking-button.glb` | The site owner's own model of her own cat, Zuko. Personal, not third-party; no licence to track. |

The desk globe is not a file: it is built in code in `src/scene/globe.ts`. It replaced a third-party Adobe Stock
model whose licence did not clearly allow serving the file from a public website. The llama bank is built in code
too, in `src/scene/llama.ts`, following `llama-bank.glb`'s proportions and glazes.

None of the models above are third-party assets, so none need attribution or a licence check.
If a model from another source is ever added here, record its source and licence in this table first.
