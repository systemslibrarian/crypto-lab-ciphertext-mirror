import type { RealityContent } from '../../components/types'

export const maskedComparisonReality: RealityContent = {
  paper: "Hermelink et al. (2024/060), The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform",
  whatPaperShows:
    'Hermelink et al. (2024/060) demonstrate that higher-order Boolean masking of the FO ciphertext comparison in ML-KEM still admits side-channel attacks. The authors show t-probing security is insufficient because realistic adversaries exceed t probes per computation.',
  whatSimModels: [
    'Deterministic PRG-driven Hamming-weight leakage with configurable Gaussian noise.',
    'Correlation analysis over simulated trace sets.',
    'Masking orders d in {0,1,2,3} with fresh shares per share-refresh boundary.',
  ],
  whatSimDoesNotModel: [
    'Real silicon power consumption and EM emanations.',
    'Clock-cycle-accurate pipeline behavior and register reuse leakage.',
    'Trace alignment drift and hardware-specific noise distributions.',
    'Attack-time optimizations and full implementation details from the paper.',
    'Concrete trace counts transferable to deployed hardware.',
  ],
}
