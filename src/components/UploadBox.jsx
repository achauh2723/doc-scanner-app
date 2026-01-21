import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

export default function UploadBox({ onFileReady }) {
  const [loading, setLoading] = useState(false);

  const convertPdfFirstPageToImage = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    return canvas.toDataURL("image/png");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      // PDF
      if (file.type === "application/pdf") {
        const previewUrl = await convertPdfFirstPageToImage(file);

        onFileReady({
          file,
          previewUrl,
          type: "pdf",
        });
      }
      // Image
      else {
        const previewUrl = URL.createObjectURL(file);

        onFileReady({
          file,
          previewUrl,
          type: "image",
        });
      }
    } catch (err) {
      console.error(err);
      alert("PDF conversion failed ");
    }

    setLoading(false);
  };

  return (
    <div style={{ border: "1px solid gray", padding: 20, width: 500 }}>
      <h3>Upload Image / PDF</h3>

      <input
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        onChange={handleFileChange}
      />

      {loading && <p>Processing...</p>}
    </div>
  );
}