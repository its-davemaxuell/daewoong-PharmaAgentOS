import type { Locator } from "@playwright/test";

type SampledControl = HTMLElement & { pressSamples: Promise<string[]> };

/** Start sampling in the input event, before a remote browser round trip can
 * consume the short press transition (especially WebKit on Windows). */
export async function samplePress(control: Locator, input: "pointerdown" | "keydown", press: () => Promise<void>) {
  await control.evaluate((element, event) => {
    const node = element as SampledControl;
    node.pressSamples = new Promise(resolve => {
      node.addEventListener(event, () => {
        const start = performance.now();
        const samples = [getComputedStyle(node).boxShadow];
        const frame = () => {
          samples.push(getComputedStyle(node).boxShadow);
          if (performance.now() - start < 220) requestAnimationFrame(frame);
          else resolve(samples);
        };
        requestAnimationFrame(frame);
      }, { once: true });
    });
  }, input);
  await press();
  return control.evaluate(node => (node as SampledControl).pressSamples);
}
