import { ElementSelectors } from '@mini-apty/shared';

// Helper to get candidate elements from DOM based on selectors
function queryCandidates(selectors: ElementSelectors): HTMLElement[] {
  const candidates = new Set<HTMLElement>();

  if (!selectors) return [];

  try {
    // 1. Check data attributes (highest specificity)
    if (selectors.dataAttributes) {
      for (const [key, value] of Object.entries(selectors.dataAttributes)) {
        const elList = document.querySelectorAll<HTMLElement>(`[${key}="${value}"]`);
        elList.forEach(el => candidates.add(el));
      }
    }

    // 2. Check unique ID
    if (selectors.idSelector) {
      const el = document.getElementById(selectors.idSelector.replace('#', ''));
      if (el) candidates.add(el);
    }

    // 3. Check robust CSS selector
    if (selectors.robustSelector) {
      const elList = document.querySelectorAll<HTMLElement>(selectors.robustSelector);
      elList.forEach(el => candidates.add(el));
    }

    // 4. Check class-based selectors
    if (selectors.classSelector) {
      const elList = document.querySelectorAll<HTMLElement>(selectors.classSelector);
      elList.forEach(el => candidates.add(el));
    }

    // 5. Fallback to tag name if set has few candidates
    if (candidates.size === 0 && selectors.tagName) {
      const elList = document.querySelectorAll<HTMLElement>(selectors.tagName.toLowerCase());
      elList.forEach(el => candidates.add(el));
    }
  } catch (err) {
    console.error('Error querying candidates:', err);
  }

  return Array.from(candidates);
}

// Compute positional XPath of an element to compare against step metadata
function computeXPath(element: HTMLElement): string {
  const paths: string[] = [];
  let current: Node | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    paths.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }

  return `/${paths.join('/')}`;
}

// Main evaluation function
export function findBestTargetElement(selectors: ElementSelectors): HTMLElement | null {
  // Defensive parse for stringified JSON returned by database
  let parsedSelectors = selectors;
  if (typeof selectors === 'string') {
    try {
      parsedSelectors = JSON.parse(selectors);
    } catch (err) {
      console.error('Failed to parse selectors string:', err);
      return null;
    }
  }

  if (!parsedSelectors) return null;
  if (!parsedSelectors.dataAttributes) parsedSelectors.dataAttributes = {};

  const candidates = queryCandidates(parsedSelectors);
  if (candidates.length === 0) return null;

  let bestElement: HTMLElement | null = null;
  let highestScore = 0;
  const threshold = 0.55; // Must score higher than this to count as a match

  for (const element of candidates) {
    // Avoid matching hidden elements or elements that are part of our extension UI overlay
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (element.tagName.startsWith('MINI-APTY') || element.closest('mini-apty-root')) continue;

    let score = 0;

    // 1. Tag name check (+0.1)
    if (element.tagName.toUpperCase() === parsedSelectors.tagName.toUpperCase()) {
      score += 0.1;
    }

    // 2. ID match (+0.3)
    if (parsedSelectors.idSelector && `#${element.id}` === parsedSelectors.idSelector) {
      score += 0.3;
    }

    // 3. Custom attributes check (+0.3 max)
    const totalAttrs = Object.keys(parsedSelectors.dataAttributes).length;
    if (totalAttrs > 0) {
      let matchedAttrs = 0;
      for (const [key, value] of Object.entries(parsedSelectors.dataAttributes)) {
        if (element.getAttribute(key) === value) {
          matchedAttrs++;
        }
      }
      score += (matchedAttrs / totalAttrs) * 0.3;
    }

    // 4. Classes match (+0.15 max)
    if (parsedSelectors.classSelector) {
      const targetClasses = parsedSelectors.classSelector.split('.').filter(Boolean);
      if (targetClasses.length > 0) {
        let matchedClasses = 0;
        targetClasses.forEach(cls => {
          if (element.classList.contains(cls)) {
            matchedClasses++;
          }
        });
        score += (matchedClasses / targetClasses.length) * 0.15;
      }
    }

    // 5. Text content matching (+0.25 max)
    if (parsedSelectors.textContent) {
      const elText = element.textContent?.trim() || '';
      if (elText === parsedSelectors.textContent) {
        score += 0.25;
      } else if (elText.includes(parsedSelectors.textContent) || parsedSelectors.textContent.includes(elText)) {
        score += 0.125;
      }
    }

    // 6. XPath similarity (+0.4 max)
    const elementXPath = computeXPath(element);
    if (elementXPath === parsedSelectors.positionalXPath) {
      score += 0.4;
    } else {
      // Partial matching: if paths end with same nodes
      const elementParts = elementXPath.split('/');
      const targetParts = parsedSelectors.positionalXPath.split('/');
      const tailMatchCount = 3;
      let matchedTail = true;

      for (let i = 1; i <= tailMatchCount; i++) {
        const elPart = elementParts[elementParts.length - i];
        const tgPart = targetParts[targetParts.length - i];
        if (!elPart || !tgPart || elPart !== tgPart) {
          matchedTail = false;
          break;
        }
      }
      if (matchedTail) score += 0.2;
    }

    // 7. Robust CSS selector match (+0.3)
    if (parsedSelectors.robustSelector) {
      try {
        if (element.matches(parsedSelectors.robustSelector)) {
          score += 0.3;
        }
      } catch (e) {
        // Ignore selector parsing warnings
      }
    }

    // Update champion candidate
    if (score > highestScore) {
      highestScore = score;
      bestElement = element;
    }
  }

  console.log(`Locating target selector ${parsedSelectors.robustSelector}. Candidates evaluated: ${candidates.length}, Champion Score: ${highestScore.toFixed(2)}`);

  return highestScore >= threshold ? bestElement : null;
}
