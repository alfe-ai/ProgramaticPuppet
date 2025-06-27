# ProgramaticPuppet

ProgramaticPuppet is an experimental WYSIWYG interface for creating and running [PuppetCore](https://github.com/alfe-ai/PuppetCore) automations without writing code.

It starts a small Express web server that serves a simple editor.  The editor lets you add numbered steps such as "Load URL", "Click", "ClickNth", "ClickText", "ClickTextCheckbox", "ClickName", "Type", "Wait", "Check Page Url", "Section Title", "Scroll Bottom", "MouseClickCoordinates" or "Screenshot".  You can then run the defined steps directly from the browser.

This is only a minimal prototype, but it demonstrates how a no‑code interface can generate and execute puppet flows.

## Quick start

```bash
# from project root
cd ProgramaticPuppet
npm install
chmod +x run.sh
./run.sh
```

Open [http://localhost:3005](http://localhost:3005) in your browser and build a small script.  Press **Run Steps** to execute the flow with PuppetCore.

For **click** and **type** steps, provide a CSS selector for the target element.
Type steps insert each character with a 0.5 s delay to better mimic human input.
If an HTML snippet is pasted instead, the server attempts to convert it to a
selector by using attributes like `id`, `name`, `class` or `data-testid`. When only plain text
is supplied (for example `username`), it is interpreted as an element id and
converted to `#username`.
If the text field is left blank, whatever was entered in the selector field is
typed into the currently focused element. This helps recover from cases where
the selector field was mistakenly used to hold the text value.
Click steps also accept an optional second field specifying which step number to jump to when the element cannot be clicked. This allows basic fallback logic when selectors fail.

The **clickText** step searches the current page for an element whose text
contains the provided value and clicks it.

The **clickName** step clicks the first element with the given `name`
attribute. Specify just the attribute value, for example `clear` will click the
element matching `[name="clear"]`. If the regular Puppeteer `click()` fails
because the node isn't deemed clickable, a fallback DOM `element.click()` is
attempted automatically.

The **clickTextCheckbox** step looks for a checkbox associated with an element
whose visible text includes the provided value and clicks it. This is handy when
checkboxes use labels or custom markup that makes them tricky to target
directly.

The **clickNth** step clicks the Nth element that matches the provided CSS
selector. The index is 1‑based, so an index of `2` clicks the second matching
element. This is useful when multiple elements share the same selector, e.g.
`.view-type-card`.

The **clickNthName** step works like **clickNth**, but targets elements by their
`name` attribute. Specify the attribute value and the 1‑based index of the
matching element. If the standard click fails, a fallback DOM `element.click()`
is attempted.

The **checkPageUrl** step compares the current page URL with the value provided
in the first field. Use the second field to specify which step number to jump
to when the URLs do **not** match, enabling simple conditional flows.

The **screenshot** step captures the current page as a PNG image. Enter a file
name to control where the screenshot is saved.

The **sectionTitle** step simply writes its text to the server console, letting you mark sections in your script.

The **scrollBottom** step scrolls the page all the way down. Use it to trigger
lazy loading or reach elements near the bottom.

The **mouseClickCoordinates** step clicks at the specified X and Y coordinates on the page.

The **selectAllText** step simulates pressing Ctrl+A to select all text inside the
currently focused input field.

The **keyPress** step presses the provided keyboard key. Key names are case-insensitive so `backspace` or `Backspace` both work.

The **tabNTimes** step automatically presses the Tab key the specified number of
times. Enter the repeat count in the second field of the UI. Each Tab press is
followed by a 0.1 second pause.

The **end** step stops execution of the current puppet instance immediately,
skipping any remaining steps. When loops are enabled, later iterations will
still run.

Each puppet has a "Close browser" checkbox in the sidebar. When enabled the
browser will automatically close once all steps finish running.

<!--
Each puppet also stores a **printifyProductURL** value. Set this URL in the text
field above the loop options. The new `loadPrintifyProductURL` step uses this
value to navigate directly to the configured product page.
-->

The main editor also includes a **Loop** option. Enable it and specify a count
to automatically repeat the entire puppet that many times. When "Close browser"
is checked the browser will be relaunched between each loop.

Use the **Rename Puppet** button in the sidebar to change the name of the
currently selected puppet.
