"use client";
export default function Toast({ message, error, onClose }: { message: string; error?: boolean; onClose: () => void }) { return <div className={`toast ${error ? "error" : ""}`} role="status" onClick={onClose}>{message}</div>; }
