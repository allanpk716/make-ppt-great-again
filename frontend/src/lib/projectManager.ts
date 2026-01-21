import { ProjectPackage, Project } from '@/types/ppt';

export class ProjectManager {
  static async exportProject(project: Project): Promise<Blob> {
    const exportPackage: ProjectPackage = {
      version: '1.0',
      meta: {
        title: project.meta.title,
        createdAt: project.meta.createdAt,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
      },
      slides: project.slides.map((slide) => ({
        id: slide.id,
        displayIndex: slide.displayIndex,
        data: slide.data,
        meta: slide.meta,
      })),
    };

    const json = JSON.stringify(exportPackage, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  static async importProject(file: File): Promise<Project> {
    const text = await file.text();
    const pkg = JSON.parse(text) as ProjectPackage;

    // 验证版本
    const isValid = await fetch('/api/project/validate-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: pkg.version }),
    }).then((r) => r.json());

    if (!isValid.valid) {
      throw new Error(`不支持的版本: ${pkg.version}`);
    }

    return {
      meta: {
        title: pkg.meta.title,
        createdAt: pkg.meta.createdAt,
        updatedAt: pkg.meta.createdAt,
        version: pkg.version,
      },
      slides: pkg.slides.map((s) => ({
        id: s.id,
        displayIndex: s.displayIndex,
        data: s.data,
        meta: s.meta,
      })),
    };
  }

  static downloadProject(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
