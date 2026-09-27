import { startService } from './service'

// Source and built startup runs the service; compiled and bundled entries import it and supply their own build identity.
await startService()
