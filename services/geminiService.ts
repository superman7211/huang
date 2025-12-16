import { GoogleGenAI } from "@google/genai";

/**
 * Sends the original image and a mask to Gemini to perform inpainting/object removal.
 * 
 * Strategy: We use a Multimodal approach. We provide both the original image and the mask image 
 * (black/white) and instruct the model to use the second image as a reference for what to edit.
 */
export const removeWatermark = async (
  originalBase64: string,
  maskBase64: string,
  mimeType: string
): Promise<string> => {
  try {
    // CRITICAL FIX:
    // 1. Force use of the specific key provided by the user to avoid invalid env keys taking precedence.
    // 2. Use 'gemini-2.5-flash-image' which is widely available and avoids 403 permission errors common with 3-pro.
    const apiKey = "AIzaSyD3JMSH1L7r3j10e7p7hZ3l0WFBvLDzVts";
    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 strings (remove data:image/png;base64, prefix if present)
    const cleanOriginal = originalBase64.split(',')[1] || originalBase64;
    const cleanMask = maskBase64.split(',')[1] || maskBase64;

    // Use gemini-2.5-flash-image for general availability and robust editing capabilities
    const model = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: "Instructions: You are an expert image editing AI. Your task is to remove specific objects or watermarks from the first image provided. " +
                  "I have provided a second image which is a black and white MASK. " +
                  "The WHITE areas in the second image indicate exactly what needs to be removed from the first image. " +
                  "1. Analyze the first image (Source). " +
                  "2. Analyze the second image (Mask). " +
                  "3. Remove the content in the Source image that corresponds to the White areas in the Mask. " +
                  "4. Inpaint the removed areas seamlessly to match the surrounding background texture, lighting, and details. " +
                  "5. DO NOT change any part of the image where the mask is Black. Preserve the original format and quality as much as possible. " +
                  "6. Return ONLY the edited image."
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanOriginal
            }
          },
          {
            inlineData: {
              mimeType: "image/png", // Mask is always generated as PNG
              data: cleanMask
            }
          }
        ]
      },
      config: {
        // imageConfig is supported by flash-image but responseMimeType is not.
        imageConfig: {} 
      }
    });

    // Extract the image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // If we get here, the model might have refused or returned text only
    let textResponse = "";
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        textResponse = response.candidates[0].content.parts[0].text;
    }
    
    console.error("Gemini Response (Text):", textResponse);
    throw new Error(textResponse || "Gemini generated a response but no image was found. The request might have been blocked by safety filters.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Throw the raw error so the UI can display it
    throw error;
  }
};