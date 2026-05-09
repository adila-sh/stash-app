import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import { ChangesPanel } from "@/components/ChangesPanel";
import { DiffViewer } from "@/components/DiffViewer";
import { useRepo } from "@/lib/repo-context";

export const Route = createFileRoute("/_layout/changes")({
  component: ChangesView,
});

function ChangesView() {
  const {
    status,
    statusBusy,
    selectedFile,
    setSelectedFile,
    diff,
    diffBusy,
    stage,
    unstage,
    commit,
  } = useRepo();

  return (
    <>
      <ChangesPanel
        status={status}
        selected={selectedFile}
        onSelect={setSelectedFile}
        onStage={stage}
        onUnstage={unstage}
        onCommit={commit}
        busy={statusBusy}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selectedFile?.path ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="flex flex-1 overflow-hidden"
        >
          <DiffViewer diff={diff} loading={diffBusy} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
