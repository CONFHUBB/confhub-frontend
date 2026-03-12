import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Save } from "lucide-react";
import http from "@/lib/http";
import toast from "react-hot-toast";

interface ExcelImportProps {
  url: string;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ url }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const save = async () => {
    toast.promise(
      async () => {
        if (!url || !file) return;
        const form = new FormData();
        form.append("file", file);

        try {
          if (url.startsWith("/")) {
            await http.post(url, form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } else {
            await fetch(url, {
              method: "POST",
              body: form,
            });
          }
          setFile(null);
        } catch (err) {
          console.error(err);
          throw err;
        }
      },
      {
        loading: "Loading",
        success: "Got the data",
        error: "Error when fetching",
      },
    );
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={openFilePicker}>
          <Upload />
          Import file
        </Button>
        <Button onClick={save} disabled={!file || !url}>
          <Save />
          Save
        </Button>
      </div>
      {file && (
        <div className="text-sm mt-2 absolute -bottom-6">{file.name}</div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ExcelImport;
