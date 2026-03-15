/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Core recursive layout engine. Parses the layout JSON tree
 * and renders each node by consulting the componentRegistry.
 *
 * Rendering workflow:
 *   1. Check node type (array / object / primitive)
 *   2. For objects, check for screen containers
 *   3. Consult componentRegistry for component matching
 *   4. Fall back to Container for unknown nodes
 *   5. For arrays, resolve type (forms/buttons/lists/pills)
 *   6. Recurse into children
 *
 * Max depth: 6 levels (configurable).
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';
import { usePreviewState } from '../../state/previewState';
import { resolveComponent, resolveArrayType, isScreenContainer } from '../../utils/componentRegistry';
import Container from './Container';
import FormField from '../ui/FormField';
import Button from '../ui/Button';
import ListItem from '../ui/ListItem';
import StatsCard from '../ui/StatsCard';

// SECTION 3 — Core Logic (helpers)

const MAX_DEPTH = 6;

/**
 * Build Tailwind classes for the interactive wrapper around each node.
 * Handles selection ring, highlight ring, and hover ring.
 */
function getWrapperClasses(selected, highlighted) {
  return `
    relative transition-all duration-300 ease-in-out outline-none cursor-pointer
    ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-xl z-10' : ''}
    ${highlighted && !selected ? 'ring-2 ring-amber-400 ring-offset-2 rounded-xl z-10 animate-pulse' : ''}
    ${!selected && !highlighted ? 'hover:ring-2 hover:ring-slate-300 hover:ring-offset-1 rounded-xl' : ''}
  `;
}

// SECTION 4 — Component Implementation
export default function LayoutRenderer({
  layout,
  wireframe = false,
  sampleData = true,
  currentPath = '',
  depth = 0,
}) {
  const { state, actions } = usePreviewState();

  // ── Safety guard ─────────────────────────────────────────────
  if (depth > MAX_DEPTH) {
    return <div className="text-red-400 text-xs p-2 text-center">Max depth reached</div>;
  }
  if (!layout) return null;

  // ── Helpers ──────────────────────────────────────────────────
  const handleClick = (e, path, name) => {
    e.stopPropagation();
    actions.select(path, name);
  };

  const isSelected = (path) => state.selectedPath === path;
  const isHighlighted = (path) => state.highlightedPath === path;

  // ════════════════════════════════════════════════════════════
  // ARRAYS
  // ════════════════════════════════════════════════════════════
  if (Array.isArray(layout)) {
    const parentKey = currentPath.split('.').pop() || '';
    const arrayType = resolveArrayType(parentKey);

    // ── Form fields ──
    if (arrayType === 'formFields') {
      return (
        <div className="space-y-3">
          {layout.map((item, i) => {
            const label = typeof item === 'string' ? item : String(item);
            const path = `${currentPath}[${i}]`;
            return (
              <div key={i} onClick={(e) => handleClick(e, path, label)} className={getWrapperClasses(isSelected(path), isHighlighted(path))}>
                <FormField label={label} path={path} wireframe={wireframe} />
              </div>
            );
          })}
        </div>
      );
    }

    // ── Buttons ──
    if (arrayType === 'buttons') {
      return (
        <div className="flex flex-wrap gap-3">
          {layout.map((item, i) => {
            const label = typeof item === 'string' ? item : String(item);
            const path = `${currentPath}[${i}]`;
            return (
              <div key={i} onClick={(e) => handleClick(e, path, label)} className={getWrapperClasses(isSelected(path), isHighlighted(path))}>
                <Button label={label} wireframe={wireframe} />
              </div>
            );
          })}
        </div>
      );
    }

    // ── List items ──
    if (arrayType === 'listItems') {
      return (
        <div className="space-y-2">
          {layout.map((item, i) => {
            const text = typeof item === 'string' ? item : String(item);
            const path = `${currentPath}[${i}]`;
            return (
              <div key={i} onClick={(e) => handleClick(e, path, text)} className={getWrapperClasses(isSelected(path), isHighlighted(path))}>
                <ListItem text={text} index={i} wireframe={wireframe} />
              </div>
            );
          })}
        </div>
      );
    }

    // ── Default: tag pills ──
    return (
      <div className="flex flex-wrap gap-2">
        {layout.map((item, i) => {
          const path = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
          const displayStr = typeof item === 'object' ? Object.keys(item)[0] || 'Unknown' : String(item);
          const selected = isSelected(path);

          return (
            <div
              key={i}
              onClick={(e) => handleClick(e, path, displayStr)}
              className={`
                px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-200 border shadow-sm
                ${selected
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 text-blue-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
                ${wireframe ? 'border-dashed shadow-none bg-slate-50' : ''}
              `}
            >
              {displayStr}
            </div>
          );
        })}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // OBJECTS
  // ════════════════════════════════════════════════════════════
  if (typeof layout === 'object') {
    return (
      <div className="space-y-4 w-full">
        {Object.entries(layout).map(([key, value]) => {
          const path = currentPath ? `${currentPath}.${key}` : key;

          // ── Screen container: only render active screen ──
          if (isScreenContainer(key)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              const screenContent = value[state.currentScreen] || value[Object.keys(value)[0]];
              const screenName = value[state.currentScreen] ? state.currentScreen : Object.keys(value)[0];
              return (
                <div key={key} className="transition-all duration-300 ease-in-out">
                  <LayoutRenderer
                    layout={screenContent}
                    wireframe={wireframe}
                    sampleData={sampleData}
                    currentPath={`${path}.${screenName}`}
                    depth={depth + 1}
                  />
                </div>
              );
            }
          }

          // ── Consult component registry ──
          const resolved = resolveComponent(key);

          if (resolved) {
            const { component: Comp, renderHint } = resolved;
            const selected = isSelected(path);

            return (
              <div
                key={key}
                onClick={(e) => handleClick(e, path, key)}
                className={getWrapperClasses(selected, isHighlighted(path))}
              >
                {/* Selection badge */}
                {selected && (
                  <div className="absolute -top-3 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-md">
                    {key}
                  </div>
                )}

                {/* Render multiple cards if hint says so and value is array */}
                {renderHint === 'arrayCards' && Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-4">
                    {value.map((childItem, i) => (
                      <StatsCard
                        key={i}
                        title={typeof childItem === 'string' ? childItem : 'Metric'}
                        data={childItem}
                        wireframe={wireframe}
                      />
                    ))}
                  </div>
                ) : (
                  <Comp title={key} data={value} wireframe={wireframe} sampleData={sampleData} />
                )}
              </div>
            );
          }

          // ── Fallback: generic Container ──
          return (
            <div
              key={key}
              onClick={(e) => handleClick(e, path, key)}
              className={getWrapperClasses(isSelected(path), isHighlighted(path))}
            >
              <Container
                name={key}
                isSelected={isSelected(path)}
                isHighlighted={isHighlighted(path)}
                wireframe={wireframe}
              >
                <LayoutRenderer
                  layout={value}
                  wireframe={wireframe}
                  sampleData={sampleData}
                  currentPath={path}
                  depth={depth + 1}
                />
              </Container>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Primitive fallback ──
  return <span className="text-slate-600 font-medium">{String(layout)}</span>;
}

// SECTION 5 — Export (default export above)
