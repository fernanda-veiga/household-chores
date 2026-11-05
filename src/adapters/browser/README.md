# Browser adapter boundary

DEV-51 implements transactional local persistence here behind application ports.
Only this adapter layer may access IndexedDB/localStorage/sessionStorage.
The UI receives operations through application composition rather than importing
this adapter directly. A later cloud adapter implements the same agreed contract.
No storage adapter or household persistence is implemented by DEV-50.
