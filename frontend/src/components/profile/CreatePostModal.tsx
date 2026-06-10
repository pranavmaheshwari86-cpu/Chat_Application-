/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";


interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 10) {
        toast.error("You can upload a maximum of 10 photos per post.");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please add at least one photo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const imageUrls: string[] = [];

      // Upload images sequentially or concurrently. Doing sequentially to avoid rate limits/overload on local
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.post("/attachments/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrls.push(uploadRes.data.url);
      }

      // Create post
      await api.post("/posts", {
        caption,
        images: imageUrls,
      });

      toast.success("Post created successfully!");
      setCaption("");
      setSelectedFiles([]);
      setPreviews([]);
      onPostCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-surface-container-lowest">
            <input 
              type="file" 
              accept="image/*" 
              multiple
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="mb-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Photos
            </Button>
            <p className="text-xs text-on-surface-variant">Max 10 photos. JPEG, PNG, WEBP.</p>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-surface-container group">
                  <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-background/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-on-surface" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea 
              value={caption} 
              onChange={(e) => setCaption(e.target.value)} 
              placeholder="Write a caption..."
              className="min-h-[120px] bg-surface-container-lowest"
            />
            <div className="text-xs text-right text-on-surface-variant">
              {caption.length} / 2200
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isSubmitting || selectedFiles.length === 0} className="metallic-gradient text-background font-bold border-0">
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
