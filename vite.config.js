export default {
    base: "/expressions_demo/",  // ✅ This sets the correct base path for GitHub Pages
    server: {
        port: 3000  // ✅ This is fine for local development but not needed for GitHub Pages
    },
    build: {
        outDir: "dist",  // ✅ Ensures the build output is in the correct folder
    }
};