# AI Workspace Widget Development Guide

This document outlines the strict rules and guidelines for creating React widgets to be used in the `AiToolManager`'s Live React Tool Studio.

## 1. Execution Environment
The Tool Studio uses **`react-live`** to render custom JSX code dynamically. 
The `<LiveProvider>` component is configured with `noInline={true}`.

**CRITICAL RULE:** Because `noInline={true}` is enabled, standard ES6 module exports (e.g., `export default WidgetName;`) **WILL FAIL** with the error:
> `SyntaxError: No-Inline evaluations must call 'render'.`

### ✅ Correct Way to Output the Component
You **must** explicitly call the globally available `render()` function at the very end of your code block, passing your component as a JSX element.

```jsx
// 1. Define your component
const MyCustomWidget = () => {
    const [count, setCount] = React.useState(0);
    return (
        <div>
            <h1>Counter: {count}</h1>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
};

// 2. Call the render function (REQUIRED)
render(<MyCustomWidget />);
```

### ❌ Incorrect Way (Do Not Use)
```jsx
const MyCustomWidget = () => { return <div>Hello</div> };

// DO NOT USE THIS
export default MyCustomWidget;
```

## 2. Available Global Context (Scope)
The `LiveProvider` injects specific global variables into the widget's execution scope. You can use these variables directly without importing them.

Available globals include:
*   `React`: Standard React object (e.g., `React.useState`, `React.useEffect`).
*   `useState`, `useEffect`: React hooks are directly available.
*   `globalUser`: An object containing the current logged-in user's data.
*   `globalSelectedSubject`: An object representing the currently selected subject in the AI Workspace top menu. Contains fields like:
    *   `id` (This is the classSubjectId)
    *   `name`

### Example Usage of Global Context
```jsx
const ContextAwareWidget = () => {
    // Auto-detect context from global scope
    const subjectId = globalSelectedSubject?.id;
    const userName = globalUser?.fullName;

    if (!subjectId) {
        return <div className="text-red-500">Please select a subject first!</div>;
    }

    return <div>Welcome {userName}, configuring for subject {subjectId}</div>;
};

render(<ContextAwareWidget />);
```

## 3. Styling & Icons
*   **TailwindCSS:** Full TailwindCSS utility classes are available. Avoid custom CSS when possible.
*   **Icons:** Do not use `import` statements for icons like `lucide-react` unless explicitly injected into the scope. Instead, use inline SVG icons to ensure zero dependencies and maximum stability within the `react-live` environment.

## 4. Data Fetching
*   Use native `fetch` API.
*   Always include the authentication token from `localStorage`:
    ```javascript
    const token = localStorage.getItem('token');
    const response = await fetch('/api/v1/some-endpoint', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    ```
*   Handle loading and error states explicitly within your component.

## 5. Navigation & External Links
For redirecting the user to internal pages (like the Nexus Editor), use standard window navigation, ensuring paths are correct relative to the React Router setup in `App.jsx`.
```javascript
window.open(`/exams/generate/nexus-editor/${responseData.id}`, '_blank');
```
