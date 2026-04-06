export default async function globalTeardown() {
    // Cleanup happens automatically — test DB persists between runs
    // for faster iteration. Use `make clean` to nuke everything.
    console.log('Test teardown complete');
}
