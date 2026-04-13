import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "perfoumer-cdn.vercel.app",
				pathname: "/perfumes/**",
			},
			{
				protocol: "https",
				hostname: "framerusercontent.com",
				pathname: "/images/**",
			},
			{
				protocol: "https",
				hostname: "fimgs.net",
				pathname: "/mdimg/perfume-thumbs/**",
			},
			{
				protocol: "https",
				hostname: "www.etirsah.com",
				pathname: "/storage/photos/**",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/:path*",
				has: [
					{
						type: "host",
						value: "www.perfoumer.az",
					},
				],
				destination: "https://perfoumer.az/:path*",
				permanent: true,
			},
		];
	},
	async headers() {
		if (process.env.NODE_ENV === "production") {
			return [];
		}

		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, max-age=0, must-revalidate",
					},
					{
						key: "Pragma",
						value: "no-cache",
					},
				],
			},
		];
	},
};

export default nextConfig;
