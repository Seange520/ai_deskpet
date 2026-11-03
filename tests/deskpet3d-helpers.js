// Read the actual scene used by the loaded Vite dependency, without a production test API.
export async function readCompanionScene(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'))?.name;
    if (!url) return null;
    const { _roots } = await import(url);
    const canvas = document.querySelector('.companion canvas');
    const state = _roots.get(canvas)?.store.getState();
    const pet = state?.scene.getObjectByName('command-pet');
    if (!pet) return null;
    const eyes = [];
    pet.traverse((object) => {
      if (object.material?.name === 'command-eye') eyes.push(object.material.emissiveIntensity);
    });
    return { z: pet.position.z, y: pet.position.y, eyes, frames: state.gl.info.render.frame };
  });
}
