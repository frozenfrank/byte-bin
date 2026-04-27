
text=""
while True:
  line=input()
  if not line:
    break

  text += line.upper() + "\n"

print("")
print("Input: ")
print(text)


base=ord("A")

def shiftLetter(c: str, offset: int) -> str:
  if not c or not c.isalpha():
    return c

  return chr((ord(c) + offset - base + 26) % 26 + base)

def printTranslate(offset: int) -> None:
  print("")
  print(f"Translated (offset={chr(base + offset)}): ")
  print("".join([shiftLetter(c, offset) for c in text]))

def findOffset() -> None:
  for offset in range(26):
    printTranslate(offset)
    print("** Press Enter to Continue**")
    input()

def main():
  while True:
    print("Do you know the offset? Enter it if known.")
    start = input("Offset: ").upper()
    if len(start) != 1:
      print("Enter one letter only. Try again.")
    elif start.isalpha():
      printTranslate(ord(start)-base)
      break
    else:
      findOffset()
      break

  print("Done.")

main()
