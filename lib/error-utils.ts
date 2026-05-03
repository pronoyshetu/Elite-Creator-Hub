/**
 * Utility to identify if an error is a Gemini API rate limit error (429).
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;

  // Handle case where error might be a string (sometimes happens with raw fetch/proxy responses)
  if (typeof error === 'string') {
    return error.includes('429') || error.includes('RESOURCE_EXHAUSTED');
  }

  // Check top level
  if (
    error.status === 'RESOURCE_EXHAUSTED' || 
    error.code === 429 ||
    error.message?.includes('429') ||
    error.message?.includes('RESOURCE_EXHAUSTED')
  ) {
    return true;
  }

  // Check nested error object (Common in REST API responses)
  if (error.error) {
    const inner = error.error;
    if (
      inner.status === 'RESOURCE_EXHAUSTED' || 
      inner.code === 429 ||
      inner.message?.includes('429') ||
      inner.message?.includes('RESOURCE_EXHAUSTED')
    ) {
      return true;
    }
  }

  // Check deeper nested (sometimes wrapped by SDK or proxy)
  if (error.response?.status === 429) {
    return true;
  }

  // Final fallback: check stringified version for reliable detection of embedded JSON errors
  try {
    const str = JSON.stringify(error).toUpperCase();
    if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED')) {
      return true;
    }
  } catch (e) {
    // If stringify fails, check if the object itself has a toString that contains the info
    try {
      const str = String(error).toUpperCase();
      if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED')) {
        return true;
      }
    } catch (e2) {
      // ignore
    }
  }

  return false;
}

export const RATE_LIMIT_MESSAGE = "You've exceeded your Gemini API quota. Please wait a moment before trying again, or check your API key usage limits at AI Studio.";
