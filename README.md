# 3DGS Inference Playground

Interactive educational web demo for understanding **3D Gaussian Splatting at inference time**.

## What it demonstrates
- A pre-fitted Gaussian cloud (medical-style skeleton scene)
- Camera pose control (position + yaw/pitch)
- Lens/frustum control (FOV, near, far)
- Visible-vs-culled Gaussian behavior
- Click-to-render inference output (bottom canvas)

## Run
Open `index.html` directly in a browser.

For a local server (recommended):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Usage
1. Set Gaussian count and scene preset.
2. Tune camera pose, FOV, near/far planes, and splat style.
3. Click **Render Inference Frame** to produce the resulting view in the lower box.
4. In top canvas, drag to orbit observer view and wheel to zoom.

