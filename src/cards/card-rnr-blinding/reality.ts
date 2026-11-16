import type { RealityContent } from '../../components/types'

export const rnrBlindingReality: RealityContent = {
  paper:
    'Taha, Cam, Duparc, Pelletier, Villegas (2025/181), Combined blinding Side-Channel and Fault countermeasures for Lattice-Based schemes',
  whatPaperShows:
    'Taha et al. (2025/181) revisit and enhance two existing blinding countermeasures rather than introducing them: the NTT blinding of Ravi et al. and the CRT-based RNR blinding of Heinz and Pöppelmann. Their contribution is a new blinded-NTT construction, a CRT-based RNR variant that samples fewer random bits with a better-integrated fault-detection mechanism, and the observation that the two are fully compatible, so combining them resists both side-channel analysis and fault injection. The proof of concept is integrated into Kyber/ML-KEM.',
  whatSimModels: [
    'Blinding-mask insertion and removal around coefficient-domain operations.',
    'Leakage correlation comparison between unblinded and blinded paths under the same synthetic model.',
    'Single-bit fault injection toggle during decapsulation pipeline.',
    'Blinded-path integrity check that can trigger abort state on mismatch.',
  ],
  whatSimDoesNotModel: [
    'Compiler and micro-architectural effects on blinded instruction sequences.',
    'Real-silicon overhead and timing impact of full countermeasure deployments.',
    'Multi-fault and adaptive attacks against the blinding strategy.',
  ],
}
