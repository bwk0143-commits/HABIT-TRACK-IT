import qrcode
print("=== QR GENERATOR===")
data=input("neter data or url")
img=qrcode.make(data)
file_name=input("enter file name(without.png):")
img.save(file_name + ".png")
print("qr generated sccessfully")
print(f"saved as :{file_name}.png")