// Consume the built package artifact (proves the shipped dist works in a real
// Eleventy build).
import eleventyPluginDot from '../dist/index.js';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyPluginDot, { useCurrentColor: true });
}
