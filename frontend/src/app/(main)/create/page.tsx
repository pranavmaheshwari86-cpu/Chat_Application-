/* eslint-disable */
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import api from '@/services/api';

export default function CreatePostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response: any = await api.post('/attachments/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const url = response.data?.url || response.url;
      if (url) setImageUrl(url);
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreate = async () => {
    if (!imageUrl) {
      toast.error('Please add an image URL');
      return;
    }

    try {
      setLoading(true);
      await api.post('/posts', {
        caption,
        images: [imageUrl]
      });
      toast.success('Post created successfully!');
      router.push('/');
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center h-full w-full py-20 px-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div className="border-b border-border p-4 font-semibold text-center flex justify-between items-center">
          <div className="w-10"></div>
          <div>Create new post</div>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 font-semibold p-0 h-auto"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Sharing...' : 'Share'}
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          {imageUrl ? (
            <div className="relative aspect-square w-full rounded-md overflow-hidden bg-secondary">
              <Image src={imageUrl} alt="Preview" fill className="object-cover" />
              <Button 
                variant="destructive" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => setImageUrl('')}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-md">
              <ImagePlus className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-4">Add photos</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? 'Uploading...' : 'Select from computer'}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Textarea 
              placeholder="Write a caption..." 
              className="resize-none border-none focus-visible:ring-0 p-0 shadow-none text-base bg-transparent"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200}
            />
            <div className="text-xs text-muted-foreground text-right">
              {caption.length} / 2200
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
