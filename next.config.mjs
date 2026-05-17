/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/FemaDongz/Wallpapers/**",
      },
      {
        protocol: "https",
        hostname: "wsrv.nl",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p16-common-sign.tiktokcdn-us.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p19-common-sign.tiktokcdn-us.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p16-sign-va.tiktokcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p19-sign.tiktokcdn-us.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p16-common-sign.tiktokcdn-eu.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "p19-common-sign.tiktokcdn-eu.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
