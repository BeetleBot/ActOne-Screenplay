# Parking

The Parking feature allows you to temporarily stash text snippets for later use.

## Usage

1. Select text in the editor
2. Right-click → **Park Selection**
3. The text is removed from the document and stored in the Parking sidebar tab

## Parking Panel (Sidebar Tab — Tools group)

Lists all parked items as rounded cards (`8px` radius with soft shadow):
- Shows preview of parked text
- Click a card to reinsert at cursor (auto-removes from Parking)
- Delete individual items (X button)
- Keyboard nav `↑`/`↓`, `Enter` to insert

## Persistence

Parked items are saved in `parking.json` within the `.actone` bundle, so they persist across sessions.

## Use Cases

- Temporarily moving a scene or paragraph aside while rewriting
- Storing alternative dialogue options
- Collecting research notes or snippets during drafting
- Holding cut content for potential reinsertion
