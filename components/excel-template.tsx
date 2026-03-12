import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

interface ExcelTemplateProps {
  url: string;
}

const ExcelTemplate: React.FC<ExcelTemplateProps> = ({ url }) => {
  const handleDownload = () => {
    if (!url) return;
    window.open(url, "_blank");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleDownload} disabled={!url}>
        <FileSpreadsheet />
        Download Template
      </Button>
    </div>
  );
};

export default ExcelTemplate;
