export default {
    base: "/expressions_demo/",
    build: {
        outDir: "dist",
        assetsDir: "assets"
    },
    optimizeDeps: {
        include: ["jspsych"]
    },
    server: {
        port: 3000
    }
};