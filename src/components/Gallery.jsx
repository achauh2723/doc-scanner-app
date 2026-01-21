import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Gallery({ userId, onSelect }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "uploads"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc") // newest first
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(data);
    });

    return () => unsub();
  }, [userId]);

  return (
    <div>
      <h4>My Uploads (Gallery)</h4>

      {items.length === 0 ? (
        <p>No uploads yet</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid gray",
                padding: 10,
                width: 200,
                cursor: "pointer",
              }}
              onClick={() => onSelect(item)}
            >
              <p style={{ fontSize: 12 }}>{item.filename}</p>

              {/* show original preview */}
              {item.originalImageBase64 && (
                <img
                  src={item.originalImageBase64}
                  alt="original"
                  style={{ width: "100%", height: 120, objectFit: "cover" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}