# 3DGS Inference Playground

This project is a small web app that helps you understand **3D Gaussian Splatting (3DGS)** in a hands-on way.

It does **not** show model training.
It shows what happens **after training**, when many Gaussian points are already fitted to a scene and you render from different camera settings.

## Who this is for

Anyone curious about 3DGS, including beginners.
You do not need to know advanced graphics math to use this demo.

## What you can do

- Explore a medical-style example scene (skeleton-like structure)
- Change how many fitted Gaussian points are in the scene
- Move the camera and change where it looks
- Adjust lens settings like field of view (FOV)
- Adjust near and far clipping planes
- Show or hide the camera frustum in the top view
- Click a button to render the final inference image in the bottom view

## Why this helps learning

As you change camera and render settings, you can immediately see:

- Which Gaussians are visible
- Which Gaussians are clipped away
- How perspective changes with FOV
- How many splats contribute to the final image

This gives an intuitive understanding of key 3DGS inference concepts.

## Files

- `index.html`: page structure and control panel
- `styles.css`: visual design and layout
- `app.js`: scene generation, camera math, interaction, and rendering logic

## How to run

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Local server (recommended)

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## How to use

1. Choose a scene preset and Gaussian count.
2. Set camera position, yaw, and pitch.
3. Adjust FOV, near plane, and far plane.
4. Click **Render Inference Frame**.
5. Compare the top explorer view and bottom rendered result.

## Notes

- This is an educational approximation, not a full production 3DGS renderer.
- The goal is to make core ideas easy to see and interact with.
