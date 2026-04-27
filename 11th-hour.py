

BASE=ord("A")

def readInitial():
  with open("11th-hour.txt", "r") as f:
    content = f.read()  # Replaces 'input()' for large blocks of text
  return content


def shiftLetter(c: str, offset: int) -> str:
  if not c or not c.isalpha():
    return c

  return chr((ord(c) - offset - BASE + 26) % 26 + BASE)

def printTranslate(offset: int) -> None:
  print("")
  print(f"Translated (offset={chr(BASE + offset)}): ")
  print("".join([shiftLetter(c, offset) for c in text]))

def findOffset() -> None:
  for offset in range(26):
    printTranslate(offset)
    print("** Press Enter to Continue**")
    input()

def main():

  global text
  text = readInitial()
  print("")
  print("Input: ")
  print(text)

  while True:
    print("Do you know the offset? Enter it if known.")
    start = input("Offset: ").upper()
    if len(start) == 0:
      findOffset()
      break
    elif len(start) > 1 or not start.isalpha():
      print("Enter one letter only. Try again.")
    else:
      printTranslate(ord(start)-BASE)
      break

  print("Done.")

main()
