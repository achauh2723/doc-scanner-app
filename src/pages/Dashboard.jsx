import React, { useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import UploadBox from "../components/UploadBox";
import { autoCropWithOpenCV } from "../utils/autocrop";
import Gallery from "../components/Gallery";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Dashboard() {
  const navigate = useNavigate();

  const [originalPreview, setOriginalPreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const imgRef = useRef(null);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // convert image url -> base64 string
  const convertToBase64 = async (imageUrl) => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // base64
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveToFirestore = async (originalUrl, processedUrl) => {
    const user = auth.currentUser;
    if (!user) return;

    console.log("Saving upload for user:", user.uid);

    const originalBase64 = await convertToBase64(originalUrl);
    const processedBase64 = processedUrl
      ? await convertToBase64(processedUrl)
      : null;

    const docRef = await addDoc(collection(db, "uploads"), {
      userId: user.uid,
      email: user.email,
      filename: "uploaded_file",
      originalImageBase64: originalBase64,
      processedImageBase64: processedBase64,
      createdAt: serverTimestamp(),
      status: processedUrl ? "processed" : "original_only",
    });

    console.log("Saved successfully, docId:", docRef.id);
  };

  const handleAutoCrop = async () => {
    setLoading(true);
    setStatus("Processing...");
    setAfterPreview(null);

    try {
      const result = await autoCropWithOpenCV(imgRef.current);
      setAfterPreview(result);
      setStatus("Done");

      await saveToFirestore(originalPreview, result);
    } catch (err) {
      setStatus("Auto crop failed (using original)");
      setAfterPreview(null);

      await saveToFirestore(originalPreview, null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>
      <p>Logged in as: {auth.currentUser?.email}</p>

      <button onClick={handleLogout}>Logout</button>

      <hr />

      <UploadBox
        onFileReady={({ previewUrl }) => {
          setOriginalPreview(previewUrl);
          setAfterPreview(null);
          setStatus("");
        }}
      />

      <br />

      {originalPreview && (
        <button onClick={handleAutoCrop} disabled={loading}>
          {loading ? "Processing..." : "Auto Crop + Save"}
        </button>
      )}

      <p>{status}</p>

      <hr />

      <h3>Before / After</h3>

      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <h4>Before</h4>
          {originalPreview && (
            <img
              ref={imgRef}
              src={originalPreview}
              alt="before"
              style={{ maxWidth: "400px", border: "1px solid black" }}
            />
          )}
        </div>

        <div>
          <h4>After</h4>
          {afterPreview ? (
            <img
              src={afterPreview}
              alt="after"
              style={{ maxWidth: "400px", border: "1px solid black" }}
            />
          ) : (
            <p>No processed output yet</p>
          )}
        </div>
      </div>

      <hr />
      <h3>Gallery</h3>

      <Gallery
        userId={auth.currentUser?.uid}
        onSelect={(item) => {
          setOriginalPreview(item.originalImageBase64);
          setAfterPreview(item.processedImageBase64);
          setStatus("Loaded from gallery");
        }}
      />
    </div>
  );
}