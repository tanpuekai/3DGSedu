# 3DGS Medical Education Playground

This project is a small web app for **medical scene education** that helps you understand **3D Gaussian Splatting (3DGS)** in a hands-on way.

It does **not** show model training.
It shows what happens **after training**, when many Gaussian points are already fitted to a scene and you render from different camera settings.

## Try it out

Click this link: https://htmlpreview.github.io/?https://github.com/tanpuekai/3DGSedu/blob/main/index.html

## Screenshot

![3DGS Medical Education Playground](./Screenshot%202026-02-28%20at%2012.30.20%E2%80%AFPM.png)

## Who this is for

Students, educators, and beginners exploring 3DGS in medical-style scenes.
You do not need to know advanced graphics math to use this demo.

## What you can do

- Explore a medical-style example scene (skeleton-like structure)
- Change how many fitted Gaussian points are in the scene
- Move the camera and change where it looks
- Adjust lens settings like field of view (FOV)
- Adjust near and far clipping planes
- Show or hide the camera frustum in the top view
- See the final inference image update instantly in the right view

## Why this helps learning

As you change camera and render settings, you can immediately see:

- Which Gaussians are visible
- Which Gaussians are clipped away
- How perspective changes with FOV
- How many splats contribute to the final image

This gives an intuitive understanding of key 3DGS inference concepts for medical visualization education.

## Files

- `index.html`: page structure and medical-education focused control panel
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
4. The right-side render updates automatically as you change values.
5. Compare the left explorer view and right rendered result.

## Notes

- This is an educational approximation, not a full production 3DGS renderer.
- The goal is to make core ideas easy to see and interact with.
