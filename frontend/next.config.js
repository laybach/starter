/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This host has a single vCPU. Next's build worker pool sizes itself off
  // cpus - 1, which comes out to 0 workers here — the parallel compile step
  // then silently no-ops (exits 0 with no output) instead of erroring, so
  // the build must run single-threaded on the main process instead.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
