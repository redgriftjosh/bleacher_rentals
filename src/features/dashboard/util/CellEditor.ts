import { Application } from "pixi.js";
import { Grid } from "./Grid";

export interface CellEditorOptions {
  app: Application;
  grid: Grid;
  cellWidth: number;
  cellHeight: number;
  gridOffsetX: number; // Grid's position offset
  gridOffsetY: number; // Grid's position offset
}

interface CellData {
  value: string;
  isEditing: boolean;
}

/**
 * Manages HTML input overlays for grid cells
 * Handles position tracking during scroll and stores cell data persistently
 */
export class CellEditor {
  private app: Application;
  private grid: Grid;
  private cellWidth: number;
  private cellHeight: number;
  private gridOffsetX: number;
  private gridOffsetY: number;

  // Track cell data by coordinates
  private cellData = new Map<string, CellData>();

  // Active input element
  private inputElement?: HTMLInputElement;
  private currentEditingCell?: { row: number; col: number };

  // Scroll tracking
  private currentScrollX = 0;
  private currentScrollY = 0;

  constructor(options: CellEditorOptions) {
    this.app = options.app;
    this.grid = options.grid;
    this.cellWidth = options.cellWidth;
    this.cellHeight = options.cellHeight;
    this.gridOffsetX = options.gridOffsetX;
    this.gridOffsetY = options.gridOffsetY;

    // Initialize with current grid scroll position using public methods
    this.currentScrollX = this.grid.getCurrentScrollX();
    this.currentScrollY = this.grid.getCurrentScrollY();

    this.setupScrollListeners();
  }

  /**
   * Create key for cell coordinate lookup
   */
  private getCellKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  /**
   * Get cell data for a specific coordinate
   */
  public getCellData(row: number, col: number): CellData {
    const key = this.getCellKey(row, col);
    return this.cellData.get(key) || { value: "", isEditing: false };
  }

  /**
   * Set cell data for a specific coordinate
   */
  public setCellData(row: number, col: number, data: Partial<CellData>): void {
    const key = this.getCellKey(row, col);
    const existing = this.getCellData(row, col);
    this.cellData.set(key, { ...existing, ...data });
  }

  /**
   * Start editing a cell at the specified coordinates
   */
  public editCell(row: number, col: number): void {
    // If already editing this cell, do nothing
    if (
      this.currentEditingCell &&
      this.currentEditingCell.row === row &&
      this.currentEditingCell.col === col
    ) {
      return;
    }

    // Commit any existing edit
    if (this.inputElement) {
      this.commitCurrentEdit();
    }

    // Set new editing state
    this.currentEditingCell = { row, col };
    const cellData = this.getCellData(row, col);
    this.setCellData(row, col, { isEditing: true });

    // Create input element

    this.createInputElement(cellData.value);

    this.positionInputElement(row, col);
  }

  /**
   * Create the HTML input element
   */
  private createInputElement(initialValue: string): void {
    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.value = initialValue;

    // Styling
    this.inputElement.style.position = "absolute";
    this.inputElement.style.border = "2px solid #007acc";
    this.inputElement.style.outline = "none";
    this.inputElement.style.zIndex = "1000";
    this.inputElement.style.background = "white";
    this.inputElement.style.fontSize = "14px";
    this.inputElement.style.padding = "4px";
    this.inputElement.style.boxSizing = "border-box";

    // Event listeners
    this.inputElement.addEventListener("blur", this.handleInputBlur);
    this.inputElement.addEventListener("keydown", this.handleInputKeydown);

    // Add to DOM

    document.body.appendChild(this.inputElement);
    this.inputElement.focus();
    this.inputElement.select();
  }

  /**
   * Position the input element over the specified cell
   */
  private positionInputElement(row: number, col: number): void {
    if (!this.inputElement) return;

    const screenPos = this.getCellScreenPosition(row, col);

    this.inputElement.style.left = `${screenPos.x}px`;
    this.inputElement.style.top = `${screenPos.y}px`;
    this.inputElement.style.width = `${this.cellWidth}px`;
    this.inputElement.style.height = `${this.cellHeight}px`;
  }

  /**
   * Calculate screen position for a cell considering current scroll
   */
  private getCellScreenPosition(row: number, col: number): { x: number; y: number } {
    // Get grid's world position
    const gridWorldPos = this.grid.getGlobalPosition();

    // Calculate cell position relative to grid's scroll offset
    const cellX = col * this.cellWidth - this.currentScrollX;
    const cellY = row * this.cellHeight - this.currentScrollY;

    const result = {
      x: gridWorldPos.x + this.gridOffsetX + cellX + 89.5,
      y: gridWorldPos.y + this.gridOffsetY * 2 + cellY + 31.5,
    };

    return result;
  }

  /**
   * Handle input blur event
   */
  private handleInputBlur = (): void => {
    this.commitCurrentEdit();
  };

  /**
   * Handle input keydown events
   */
  private handleInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      this.commitCurrentEdit();
    } else if (e.key === "Escape") {
      this.cancelCurrentEdit();
    }
  };

  /**
   * Commit the current edit and save the value
   */
  private commitCurrentEdit(): void {
    if (!this.inputElement || !this.currentEditingCell) return;

    const { row, col } = this.currentEditingCell;
    const value = this.inputElement.value;

    // Save the value and mark as not editing
    this.setCellData(row, col, { value, isEditing: false });

    // Clean up input element
    this.destroyInputElement();
    this.currentEditingCell = undefined;
  }

  /**
   * Cancel the current edit without saving
   */
  private cancelCurrentEdit(): void {
    if (!this.currentEditingCell) return;

    const { row, col } = this.currentEditingCell;

    // Mark as not editing without changing value
    this.setCellData(row, col, { isEditing: false });

    // Clean up input element
    this.destroyInputElement();
    this.currentEditingCell = undefined;

    console.log(`Cancelled edit for cell (${row}, ${col})`);
  }

  /**
   * Remove the input element from DOM
   */
  private destroyInputElement(): void {
    if (this.inputElement) {
      this.inputElement.removeEventListener("blur", this.handleInputBlur);
      this.inputElement.removeEventListener("keydown", this.handleInputKeydown);

      if (this.inputElement.parentNode) {
        this.inputElement.parentNode.removeChild(this.inputElement);
      }

      this.inputElement = undefined;
    }
  }

  /**
   * Update scroll position and reposition input if needed
   */
  private updateScrollPosition(scrollX: number, scrollY: number): void {
    this.currentScrollX = scrollX;
    this.currentScrollY = scrollY;

    // Reposition input element if one is active
    if (this.inputElement && this.currentEditingCell) {
      this.positionInputElement(this.currentEditingCell.row, this.currentEditingCell.col);
    }
  }

  /**
   * Manually update the scroll position (useful for initialization)
   */
  public setScrollPosition(scrollX: number, scrollY: number): void {
    this.updateScrollPosition(scrollX, scrollY);
  }

  /**
   * Set up listeners for grid scroll events
   */
  private setupScrollListeners(): void {
    this.grid.on("grid:scroll-horizontal", (scrollX: number) => {
      this.updateScrollPosition(scrollX, this.currentScrollY);
    });

    this.grid.on("grid:scroll-vertical", (scrollY: number) => {
      this.updateScrollPosition(this.currentScrollX, scrollY);
    });
  }

  /**
   * Check if a cell is currently being edited
   */
  public isCellEditing(row: number, col: number): boolean {
    return this.getCellData(row, col).isEditing;
  }

  /**
   * Get the value for a cell
   */
  public getCellValue(row: number, col: number): string {
    return this.getCellData(row, col).value;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.commitCurrentEdit();
    this.destroyInputElement();
    this.cellData.clear();
  }
}
