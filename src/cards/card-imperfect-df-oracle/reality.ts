import type { RealityContent } from '../../components/types'

export const imperfectDfReality: RealityContent = {
  paper:
    'Guo, Nabokov, Johansson (2026/070), Unlocking the True Potential of Decryption Failure Oracles: A Hybrid Adaptive-LDPC Attack on ML-KEM Using Imperfect Oracles',
  whatPaperShows:
    'Guo, Nabokov, and Johansson (2026/070) revisit decryption-failure oracle attacks on ML-KEM and show that imperfect oracles (noisy answers, partial availability) still enable key recovery via adaptive LDPC decoding.',
  whatSimModels: [
    'A synthetic secret of 64 coefficients attacked by a hybrid of adaptive direct probes and random LDPC parity checks.',
    'A binary symmetric oracle channel with tunable error rate p_err and availability alpha.',
    'Sum-product belief propagation over the Tanner graph fusing channel LLRs and parity constraints.',
    'Convergence metrics of recovered fraction versus total queries.',
  ],
  whatSimDoesNotModel: [
    'Real side-channel or fault collection pipeline on deployed hardware.',
    'Full parameter sweep and concrete complexity tuning from the paper.',
    'Implementation-specific countermeasure quirks in vendor ML-KEM stacks.',
  ],
}
