interface PlotlineThread {
  code: string;
  name: string;
}

interface PlotlinesData {
  threads: PlotlineThread[];
}

interface Dilemma {
  threadCode: string;
  plotlineThreadCode?: string | null;
}

export function resolveDilemmaThread(
  dilemma: Dilemma,
  plotlines: PlotlinesData,
  base: string,
): { label: string; href: string | null } {
  if (dilemma.threadCode === 'DAOD') {
    return { label: 'Age of Disorder', href: null };
  }

  if (dilemma.plotlineThreadCode) {
    const thread = plotlines.threads.find((t) => t.code === dilemma.plotlineThreadCode);
    if (thread) {
      return { label: thread.name, href: `${base}/plot/#thread-${thread.code}` };
    }
  }

  return { label: '???', href: null };
}
