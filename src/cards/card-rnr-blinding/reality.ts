import type { RealityContent } from '../../components/types'

export const rnrBlindingReality: RealityContent = {
  paper:
    'Duparc and Taha (2025/181), Improved NTT and CRT-based RNR Blinding for Side-Channel and Fault Resistant Kyber',
  whatPaperShows:
    'Duparc and Taha (2025/181) introduce an NTT and CRT-based RNR blinding scheme for Kyber that provides resistance against both side-channel analysis and fault injection, with explicit fault-detection on the blinded path.',
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
