import { useCallback, useEffect, useState } from "react";
import { Plus, Search, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ExportButton";
import { TutorialPanel, TutorialButton } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { DealFormModal } from "./DealFormModal";
import type { Deal, Pipeline, PipelineStage } from "@/types/deals";
import type { PaginatedResponse } from "@/types/crm";

export function PipelineBoardPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("deals");
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [search, setSearch] = useState("");
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const { get: getPipelines } = useApi<Pipeline[]>();
  const { get: getDeals } = useApi<PaginatedResponse<Deal>>();
  const { post: moveStage } = useApi<Deal>();

  const loadPipelines = useCallback(async () => {
    const result = await getPipelines("/pipelines");
    if (result) {
      setPipelines(result);
      const defaultPipeline = result.find((p) => p.is_default) || result[0];
      if (defaultPipeline) {
        setSelectedPipeline(defaultPipeline);
      }
    }
  }, [getPipelines]);

  const loadDeals = useCallback(async () => {
    if (!selectedPipeline) return;
    const params = new URLSearchParams({
      pipeline_id: selectedPipeline.id,
      page_size: "100",
    });
    if (search) {
      params.set("search", search);
    }
    const result = await getDeals(`/deals?${params}`);
    if (result) {
      setDeals(result.items);
    }
  }, [getDeals, selectedPipeline, search]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (selectedPipeline) {
      loadDeals();
    }
  }, [selectedPipeline, loadDeals]);

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stage: PipelineStage) => {
    if (!draggedDeal || draggedDeal.stage_id === stage.id) {
      setDraggedDeal(null);
      return;
    }

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === draggedDeal.id
          ? { ...d, stage_id: stage.id, stage_name: stage.name }
          : d
      )
    );

    // API call
    await moveStage(`/deals/${draggedDeal.id}/move-stage?stage_id=${stage.id}`, {});
    setDraggedDeal(null);
  };

  const getDealsForStage = (stageId: string) => {
    return deals.filter((d) => d.stage_id === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum, d) => sum + (d.value || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDealSaved = () => {
    setShowDealModal(false);
    setEditingDeal(null);
    loadDeals();
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="deals" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deals</h1>
          <p className="text-muted-foreground">Manage your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          {tutorial && <TutorialButton tutorial={tutorial} />}
          <ExportButton
            entityType="deals"
            pipelineId={selectedPipeline?.id}
          />
          <Button onClick={() => setShowDealModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select
          value={selectedPipeline?.id || ""}
          onChange={(e) => {
            const pipeline = pipelines.find((p) => p.id === e.target.value);
            setSelectedPipeline(pipeline || null);
          }}
          className="w-48"
        >
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {selectedPipeline && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {selectedPipeline.stages
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const stageDeals = getDealsForStage(stage.id);
              const stageTotal = getStageTotal(stage.id);

              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-72"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                >
                  <div className="bg-muted rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{stage.name}</h3>
                      <Badge variant="secondary">{stageDeals.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(stageTotal)}
                    </p>
                    {stage.probability > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {stage.probability}% probability
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 min-h-[200px]">
                    {stageDeals.map((deal) => (
                      <Card
                        key={deal.id}
                        draggable
                        onDragStart={() => handleDragStart(deal)}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        onClick={() => {
                          setEditingDeal(deal);
                          setShowDealModal(true);
                        }}
                      >
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {deal.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(deal.value)}
                            </span>
                          </div>
                          {deal.expected_close_date && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(deal.expected_close_date).toLocaleDateString()}
                            </div>
                          )}
                          {deal.company_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {deal.company_name}
                            </p>
                          )}
                          {deal.contact_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {deal.contact_name}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {showDealModal && selectedPipeline && (
        <DealFormModal
          pipeline={selectedPipeline}
          deal={editingDeal}
          onClose={() => {
            setShowDealModal(false);
            setEditingDeal(null);
          }}
          onSaved={handleDealSaved}
        />
      )}
    </div>
  );
}
