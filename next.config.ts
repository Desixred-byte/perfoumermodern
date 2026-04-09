import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "perfoumer-cdn.vercel.app",
				pathname: "/perfumes/**",
			},
		],
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
