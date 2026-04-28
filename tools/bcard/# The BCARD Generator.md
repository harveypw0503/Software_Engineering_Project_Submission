<!-- Harvey Walter, BCARD Tests -->

# The BCARD Generator

The BCARD Generator is static client side html, css and, js. It let's users design double-sided business cards.


## Test 1:
**TDD - Undo / Redo History Management (automated)**

The undo/redo stack must snapshot (function snapshot) each card state and store it properly.

**Cycle 1:** 
Requirement: Pushing a into the history (pushHistory) must increase histotyIndex to new, last snapshot.
Test (Failing): 

              function testPushHistory() {
                history = []; historyIdx = -1;
                pushHistory();
                console.assert(history.length === 1, "History length should be 1");
                console.assert(historyIdx === 0, "historyIdx should be 0");
              }
              testPushHistory();

Run test Evidence: Console error: "History length should be 1"
Code: 
Run Test: 
Refactor:

**Cycle 2**
Requirement: undo() must subtract from historyIndex and call restoreSnapshot
Test (Failing): Added second snapshot that calls undo()
Run Test Evidence: Failed if index stays at 1
Code: 
Run Test: 
Refactor:

**Cycle 3**
Requirement: After undo and redo, the exact same snapshot and state must be restored.
Test (failing): created 2 snapshots, undid it, then redid it.
Run Test Evidence:
Code:
Run Test:
Refactor:

## Test 2:
**TDD - Background Mode Switching (Color, Image, Gradient) (Manual)**

Switch between color selection and images panels and also let .wcgr upload override either.

**Cycle 1**
Requirement: Clicking on the Image button should hide the color selection and reveal the image selection.
Test (failing): Manual steps: Click on the Canvas tab, then click the Image button in the Background section, inspect
Run Test Evidence: Color selection panel still visible
Code:
Run Test:
Refactor:

**Cycle 2**
Requirement: Switching back to color must remove the image URL and restore the solid color.
Test (failing): Switch to image, then upload, then switch to color, inspect
Run Test Evidence: Is the image URL still there?
Code: 
Run Test: 
Refactor:

**Cycle 3**
Requirement: When a .wcgr gradient is chosen for the background via advanced tooling, that must override other background selections.
Test (failing): .wcgr does not load properly and is formatted incorrectly.
Run Test Evidence: .wcg loads over the background correctly formatted.
Code: 
Run Test: 
Refactor:

## Test 3:
**Card Flipping and Ensuring Sides Retain Their Content (Manual)**

1. Click Flip button, front becomes hidden, back becomes visible.
2. Front layers become hidden, back layers become visible upon flipping.
3. Refreshing the page always resets the Business card and reset the side to the front.

## Test 4:
**Contact Info and text Elements Sync (Automatic)**

addField(), removeField(), and syncContactElements() must create and delete their own text elements on the card, default set to back

Automated test script:

              function testContactSync() {
                fieldCounters.email = 0; elements.back = [];
                addField('email', true); // suppressSync
                document.getElementById('email-val-0').value = 'test@acme.com';
                document.getElementById('email-lbl-0').value = 'Work';
                syncContactElements();
                console.assert(elements.back.length === 1, "Should create 1 element");
                console.assert(elements.back[0].text.includes('WORK') && elements.back[0].text.includes('test@acme.com'), "Text format wrong");
              }
testContactSync();
console.log("Test 4 (Contact Sync) PASSED");

test covers: email, phone, address, removing a field, making sure back-side DOM elements appear and disappear.

## Test 5:
**Export PNG/PDF Scale Handling**

1. Click the Download PNG Button. Two downloads begin, both PNG files, one front, one back.
2. Click the Download PDF button. Downloads one multi-page PDF.
3. Change the card size to a different proportion, export the files either via PNG or PDF, the new dimensions should apply.
4. Exports preserve: typeface, images, rotation, scale, etc.