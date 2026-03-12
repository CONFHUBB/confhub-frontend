import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExcelExportProps {
  url: string;
}

const ExcelExport: React.FC<ExcelExportProps> = ({ url }) => {
  const handleExport = () => {
    if (!url) return;
    window.open(url, "_blank");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleExport} disabled={!url}>
        <Download />
        Export
      </Button>
    </div>
  );
};

export default ExcelExport;
