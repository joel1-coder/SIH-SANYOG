import { store } from "./demoStore";
import type { SanyogRequest } from "../../shared/types";

export type EmbeddingVector = Record<string, number>;

/**
 * Indic & Multilingual Subword Tokenizer and Embedding Generator
 * Emulates multilingual dense sentence embeddings (IndicBERT / multilingual transformer)
 */
export function getMultilingualEmbedding(text: string): EmbeddingVector {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  const vector: Record<string, number> = {};

  // Word unigrams and character n-grams (subwords) to handle Indian language morphological variants
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    // Word feature
    const wKey = `w:${word}`;
    vector[wKey] = (vector[wKey] || 0) + 1.5;

    // 3-gram subword embeddings (critical for Indic agglutinative inflections)
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.slice(i, i + 3);
        const tKey = `ng3:${trigram}`;
        vector[tKey] = (vector[tKey] || 0) + 0.8;
      }
    }
  }

  // L2 Normalization of embedding vector
  let sumSq = 0;
  const keys = Object.keys(vector);
  for (let i = 0; i < keys.length; i++) {
    const val = vector[keys[i]];
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;

  const normalizedVector: Record<string, number> = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    normalizedVector[key] = vector[key] / norm;
  }

  return normalizedVector;
}

/**
 * Calculates Cosine Similarity between two sentence embeddings:
 * CosineSim(u, v) = (u . v) / (||u|| * ||v||)
 */
export function calculateCosineSimilarity(
  vecA: EmbeddingVector,
  vecB: EmbeddingVector
): number {
  let dotProduct = 0;
  const keysA = Object.keys(vecA);
  for (let i = 0; i < keysA.length; i++) {
    const token = keysA[i];
    const weightB = vecB[token];
    if (weightB !== undefined) {
      dotProduct += vecA[token] * weightB;
    }
  }
  return Math.min(1, Math.max(0, dotProduct));
}

export interface ReportCluster {
  clusterId: string;
  topic: string;
  requestType: string;
  count: number;
  requests: SanyogRequest[];
  centroidLocations: Array<{ lat: number; lng: number; address: string }>;
  averageSimilarity: number;
}

/**
 * Clusters reports based on semantic sentence embeddings and cosine similarity
 */
export function clusterReports(
  requests: SanyogRequest[],
  similarityThreshold = 0.55
): ReportCluster[] {
  const clusters: ReportCluster[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < requests.length; i++) {
    const base = requests[i];
    if (processed.has(base.trackingId)) continue;

    const baseVec = getMultilingualEmbedding(base.description);
    const clusterMembers: SanyogRequest[] = [base];
    processed.add(base.trackingId);
    let totalSim = 1.0;

    for (let j = i + 1; j < requests.length; j++) {
      const candidate = requests[j];
      if (processed.has(candidate.trackingId)) continue;
      if (candidate.requestType !== base.requestType) continue;

      const candidateVec = getMultilingualEmbedding(candidate.description);
      const similarity = calculateCosineSimilarity(baseVec, candidateVec);

      if (similarity >= similarityThreshold) {
        clusterMembers.push(candidate);
        processed.add(candidate.trackingId);
        totalSim += similarity;
      }
    }

    clusters.push({
      clusterId: `CLUST-${base.trackingId}`,
      topic: base.description.slice(0, 60) + (base.description.length > 60 ? "..." : ""),
      requestType: base.requestType,
      count: clusterMembers.length,
      requests: clusterMembers,
      centroidLocations: clusterMembers.map((m) => m.location),
      averageSimilarity: Number((totalSim / clusterMembers.length).toFixed(2)),
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * Advanced Semantic Deduplication using Sentence Embeddings & Cosine Similarity
 */
export function findSemanticDuplicates(
  newDescription: string,
  requestType: string,
  threshold = 0.72
): { isDuplicate: boolean; similarity: number; matchingRequest?: SanyogRequest } {
  const newVec = getMultilingualEmbedding(newDescription);
  let bestSim = 0;
  let bestMatch: SanyogRequest | undefined;

  for (let i = 0; i < store.requests.length; i++) {
    const req = store.requests[i];
    if (req.requestType === requestType) {
      const reqVec = getMultilingualEmbedding(req.description);
      const sim = calculateCosineSimilarity(newVec, reqVec);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = req;
      }
    }
  }

  return {
    isDuplicate: bestSim >= threshold,
    similarity: Number(bestSim.toFixed(3)),
    matchingRequest: bestSim >= threshold ? bestMatch : undefined,
  };
}
