<script setup lang="ts">
// "Progress arc" — final logo, edge-to-edge (no frame, no padding).
// Light-blue track, blue 270° progress arc, saturated green center dot.
</script>

<template>
  <span class="logo-icon">
    <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="64" cy="64" r="57"
        stroke="oklch(90% 0.05 240)"
        stroke-width="14"
      />
      <circle
        cx="64" cy="64" r="57"
        stroke="oklch(58% 0.13 240)"
        stroke-width="14"
        stroke-linecap="round"
        stroke-dasharray="269 358"
        transform="rotate(-90 64 64)"
      />
      <circle cx="64" cy="64" r="26" fill="oklch(0.7 0.18 155)" />
    </svg>
  </span>
</template>
